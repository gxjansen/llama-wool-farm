// Main API handler for Netlify Functions
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    const { path, httpMethod, body } = event
    const pathParts = path.split('/').filter(Boolean)
    
    // Remove 'api' from path if present
    if (pathParts[0] === 'api') {
      pathParts.shift()
    }
    
    // Remove '.netlify/functions' from path if present
    if (pathParts[0] === '.netlify') {
      pathParts.splice(0, 2)
    }

    const [resource, id] = pathParts
    const requestBody = body ? JSON.parse(body) : null

    switch (resource) {
      case 'game-state':
        return await handleGameState(supabase, httpMethod, id, requestBody, headers)
      
      case 'leaderboard':
        return await handleLeaderboard(supabase, httpMethod, id, requestBody, headers)
      
      case 'user':
        return await handleUser(supabase, httpMethod, id, requestBody, headers)
      
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Endpoint not found' })
        }
    }
  } catch (error) {
    console.error('API error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

async function handleGameState(supabase, method, id, body, headers) {
  const authHeader = headers.authorization
  
  if (!authHeader) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authorization required' })
    }
  }

  try {
    const { data: user, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    switch (method) {
      case 'GET':
        const { data, error } = await supabase
          .from('game_states')
          .select('*')
          .eq('user_id', user.user.id)
          .order('updated_at', { ascending: false })
          .limit(1)

        if (error) throw error

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: data[0] || null })
        }

      case 'POST':
      case 'PUT':
        const { data: saveData, error: saveError } = await supabase
          .from('game_states')
          .upsert({
            user_id: user.user.id,
            state: body.state,
            version: body.version || 1
          })
          .select()

        if (saveError) throw saveError

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: saveData[0] })
        }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

async function handleLeaderboard(supabase, method, category, body, headers) {
  try {
    switch (method) {
      case 'GET':
        const { data, error } = await supabase
          .from('leaderboards')
          .select(`
            *,
            users (
              username,
              email
            )
          `)
          .eq('category', category || 'global')
          .order('score', { ascending: false })
          .limit(100)

        if (error) throw error

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data })
        }

      case 'POST':
        const authHeader = headers.authorization
        
        if (!authHeader) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authorization required' })
          }
        }

        const { data: user, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )

        if (authError) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid token' })
          }
        }

        const { data: insertData, error: insertError } = await supabase
          .from('leaderboards')
          .insert({
            user_id: user.user.id,
            category: body.category || 'global',
            score: body.score,
            metadata: body.metadata || {}
          })
          .select()

        if (insertError) throw insertError

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ data: insertData[0] })
        }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

async function handleUser(supabase, method, id, body, headers) {
  try {
    switch (method) {
      case 'GET':
        const { data, error } = await supabase
          .from('users')
          .select('id, username, email, created_at')
          .eq('id', id)
          .single()

        if (error) throw error

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data })
        }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}