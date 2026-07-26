import { supabase } from '../../supabase/client.js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { action, email, password, token } = JSON.parse(event.body)

    // ===== SIGNUP =====
    if (action === 'signup') {
      // Check if user exists
      const { data: existing } = await supabase
        .from('voters')
        .select('id')
        .eq('email', email)
        .single()

      if (existing) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Email already registered' })
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const { data: user, error } = await supabase
        .from('voters')
        .insert([{ email, password: hashedPassword }])
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Account created!' })
      }
    }

    // ===== LOGIN =====
    if (action === 'login') {
      const { data: user } = await supabase
        .from('voters')
        .select('*')
        .eq('email', email)
        .single()

      if (!user) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid email or password' })
        }
      }

      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid email or password' })
        }
      }

      // Create session token
      const token = crypto.randomBytes(32).toString('hex')

      // Store session
      await supabase
        .from('sessions')
        .insert([{ voter_id: user.id, token }])

      // Update last_login
      await supabase
        .from('voters')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token,
          voter_id: user.id,
          email: user.email
        })
      }
    }

    // ===== LOGOUT =====
    if (action === 'logout') {
      await supabase
        .from('sessions')
        .delete()
        .eq('token', token)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid action' })
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    }
  }
}