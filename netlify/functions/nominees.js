import { supabase } from '../../supabase/client.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // ===== GET all nominees for a category =====
    if (event.httpMethod === 'GET') {
      const categoryId = event.queryStringParameters?.category_id

      if (categoryId) {
        // Get nominees for specific category
        const { data, error } = await supabase
          .from('nominees')
          .select('*')
          .eq('category_id', categoryId)
          .order('name')

        if (error) throw error

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, nominees: data })
        }
      } else {
        // Get all nominees with category info
        const { data, error } = await supabase
          .from('nominees')
          .select(`
            *,
            categories (id, name)
          `)
          .order('category_id')

        if (error) throw error

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, nominees: data })
        }
      }
    }

    // ===== CREATE new nominee =====
    if (event.httpMethod === 'POST') {
      const { category_id, name, photo } = JSON.parse(event.body)

      if (!category_id || !name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'category_id and name are required' })
        }
      }

      const { data, error } = await supabase
        .from('nominees')
        .insert([{ category_id, name, photo: photo || null }])
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, nominee: data })
      }
    }

    // ===== UPDATE nominee =====
    if (event.httpMethod === 'PUT') {
      const { id, name, photo } = JSON.parse(event.body)

      if (!id || !name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'id and name are required' })
        }
      }

      const updateData = { name }
      if (photo !== undefined) updateData.photo = photo

      const { data, error } = await supabase
        .from('nominees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, nominee: data })
      }
    }

    // ===== DELETE nominee =====
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body)

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'id is required' })
        }
      }

      const { error } = await supabase
        .from('nominees')
        .delete()
        .eq('id', id)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Nominee deleted' })
      }
    }

    // ===== BATCH UPDATE (for admin-nominees.html) =====
    if (event.httpMethod === 'PATCH') {
      const { category_id, nominees } = JSON.parse(event.body)

      if (!category_id || !nominees || !Array.isArray(nominees)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'category_id and nominees array are required' })
        }
      }

      // Delete all existing nominees for this category
      await supabase
        .from('nominees')
        .delete()
        .eq('category_id', category_id)

      // Insert new nominees
      const insertData = nominees.map(name => ({
        category_id: category_id,
        name: name.trim()
      })).filter(n => n.name.length > 0)

      if (insertData.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'At least one nominee name is required' })
        }
      }

      const { data, error } = await supabase
        .from('nominees')
        .insert(insertData)
        .select()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, nominees: data })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }

  } catch (err) {
    console.error('Nominees error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    }
  }
}