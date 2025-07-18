// Supabase Edge Function for game state synchronization
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface GameState {
  id?: string
  user_id: string
  state: any
  version: number
  checksum?: string
}

interface SyncRequest {
  gameState: GameState
  lastSyncTime?: string
  conflictResolution?: 'client' | 'server' | 'merge'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid token')
    }

    const { method, url } = req
    const urlParts = new URL(url).pathname.split('/').filter(Boolean)
    const action = urlParts[urlParts.length - 1]

    switch (method) {
      case 'GET':
        return await handleGetGameState(supabase, user.id)
      
      case 'POST':
        const syncRequest: SyncRequest = await req.json()
        
        if (action === 'sync') {
          return await handleSyncGameState(supabase, user.id, syncRequest)
        } else {
          return await handleSaveGameState(supabase, user.id, syncRequest.gameState)
        }
      
      case 'PUT':
        const updateRequest: SyncRequest = await req.json()
        return await handleUpdateGameState(supabase, user.id, updateRequest.gameState)
      
      default:
        throw new Error('Method not allowed')
    }
  } catch (error) {
    console.error('Game sync error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    )
  }
})

async function handleGetGameState(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('game_states')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) {
    throw error
  }

  return new Response(
    JSON.stringify({ 
      gameState: data[0] || null,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleSaveGameState(supabase: any, userId: string, gameState: GameState) {
  // Generate checksum for integrity
  const checksum = await generateChecksum(gameState.state)
  
  const { data, error } = await supabase
    .from('game_states')
    .insert({
      user_id: userId,
      state: gameState.state,
      version: gameState.version,
      checksum: checksum
    })
    .select()

  if (error) {
    throw error
  }

  return new Response(
    JSON.stringify({ 
      gameState: data[0],
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleUpdateGameState(supabase: any, userId: string, gameState: GameState) {
  // Generate checksum for integrity
  const checksum = await generateChecksum(gameState.state)
  
  const { data, error } = await supabase
    .from('game_states')
    .update({
      state: gameState.state,
      version: gameState.version,
      checksum: checksum,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()

  if (error) {
    throw error
  }

  return new Response(
    JSON.stringify({ 
      gameState: data[0],
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleSyncGameState(supabase: any, userId: string, syncRequest: SyncRequest) {
  // Get current server state
  const { data: serverState, error: fetchError } = await supabase
    .from('game_states')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (fetchError) {
    throw fetchError
  }

  const serverGameState = serverState[0]
  const clientGameState = syncRequest.gameState

  // If no server state exists, save client state
  if (!serverGameState) {
    return await handleSaveGameState(supabase, userId, clientGameState)
  }

  // Check for conflicts
  const serverUpdatedAt = new Date(serverGameState.updated_at)
  const lastSyncTime = syncRequest.lastSyncTime ? new Date(syncRequest.lastSyncTime) : new Date(0)
  
  const hasConflict = serverUpdatedAt > lastSyncTime && 
                     serverGameState.version !== clientGameState.version

  if (hasConflict) {
    // Handle conflict resolution
    switch (syncRequest.conflictResolution) {
      case 'client':
        // Client wins - update server with client state
        return await handleUpdateGameState(supabase, userId, clientGameState)
      
      case 'server':
        // Server wins - return server state
        return new Response(
          JSON.stringify({ 
            gameState: serverGameState,
            conflict: true,
            resolution: 'server',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      
      case 'merge':
        // Merge states (basic implementation)
        const mergedState = mergeGameStates(serverGameState.state, clientGameState.state)
        const mergedGameState = {
          ...clientGameState,
          state: mergedState,
          version: Math.max(serverGameState.version, clientGameState.version) + 1
        }
        return await handleUpdateGameState(supabase, userId, mergedGameState)
      
      default:
        // Return conflict for manual resolution
        return new Response(
          JSON.stringify({ 
            gameState: serverGameState,
            clientState: clientGameState,
            conflict: true,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  }

  // No conflict - update server with client state
  return await handleUpdateGameState(supabase, userId, clientGameState)
}

function mergeGameStates(serverState: any, clientState: any): any {
  // Basic merge strategy - take the higher values for resources
  // and merge arrays/objects
  const merged = { ...serverState }
  
  for (const key in clientState) {
    if (clientState.hasOwnProperty(key)) {
      const serverValue = serverState[key]
      const clientValue = clientState[key]
      
      if (typeof clientValue === 'number' && typeof serverValue === 'number') {
        // Take the higher value for numeric resources
        merged[key] = Math.max(serverValue, clientValue)
      } else if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
        // Merge arrays, removing duplicates
        merged[key] = [...new Set([...serverValue, ...clientValue])]
      } else if (typeof clientValue === 'object' && typeof serverValue === 'object') {
        // Recursively merge objects
        merged[key] = mergeGameStates(serverValue, clientValue)
      } else {
        // Take client value for other types
        merged[key] = clientValue
      }
    }
  }
  
  return merged
}

async function generateChecksum(data: any): Promise<string> {
  const encoder = new TextEncoder()
  const dataString = JSON.stringify(data)
  const buffer = encoder.encode(dataString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}