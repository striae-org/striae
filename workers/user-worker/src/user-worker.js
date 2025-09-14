const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.striae.org',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

async function authenticate(request, env) {
  const authKey = request.headers.get('X-Custom-Auth-Key');
  if (authKey !== env.USER_DB_AUTH) throw new Error('Unauthorized');
}

async function handleGetUser(env, userUid) {
  try {
    const value = await env.USER_DB.get(userUid);
    if (value === null) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    return new Response(value, { 
      status: 200, 
      headers: corsHeaders 
    });
  } catch (error) {
    return new Response('Failed to get user data', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

async function handleAddUser(request, env, userUid) {
  try {
    const { email, firstName, lastName, company, permitted } = await request.json();
    
    // Check for existing user
    const value = await env.USER_DB.get(userUid);
    
    let userData;
    if (value !== null) {
      // Update existing user, preserving cases
      const existing = JSON.parse(value);
      userData = {
        ...existing,
        email: email || existing.email,
        firstName: firstName || existing.firstName,
        lastName: lastName || existing.lastName,
        company: company || existing.company,
        permitted: permitted !== undefined ? permitted : existing.permitted,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Create new user
      userData = {
        uid: userUid,
        email,
        firstName,
        lastName,
        company,
        permitted: permitted !== undefined ? permitted : true,
        cases: [],
        createdAt: new Date().toISOString()
      };
    }

    // Store value in KV
    await env.USER_DB.put(userUid, JSON.stringify(userData));

    return new Response(JSON.stringify(userData), {
      status: value !== null ? 200 : 201,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response('Failed to save user data', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

async function handleDeleteUser(env, userUid) {
  try {
    
    await env.USER_DB.delete(userUid);
    
    return new Response('Successful delete', {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response('Failed to delete user', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

async function handleAddCases(request, env, userUid) {
  try {
    const { cases = [] } = await request.json();
    
    // Get current user data
    const value = await env.USER_DB.get(userUid);
    if (!value) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update cases
    const userData = JSON.parse(value);
    const existingCases = userData.cases || [];
    
    // Filter out duplicates
    const newCases = cases.filter(newCase => 
      !existingCases.some(existingCase => 
        existingCase.caseNumber === newCase.caseNumber
      )
    );

    // Update user data
    userData.cases = [...existingCases, ...newCases];
    userData.updatedAt = new Date().toISOString();

    // Save to KV
    await env.USER_DB.put(userUid, JSON.stringify(userData));

    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response('Failed to add cases', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

async function handleDeleteCases(request, env, userUid) {
  try {
    const { casesToDelete } = await request.json();
    
    // Get current user data
    const value = await env.USER_DB.get(userUid);
    if (!value) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update user data
    const userData = JSON.parse(value);
    userData.cases = userData.cases.filter(c => 
      !casesToDelete.includes(c.caseNumber)
    );
    userData.updatedAt = new Date().toISOString();

    // Save to KV
    await env.USER_DB.put(userUid, JSON.stringify(userData));

    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response('Failed to delete cases', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
      await authenticate(request, env);
      
      const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const userUid = parts[1];
    const isCasesEndpoint = parts[2] === 'cases';
    
    if (!userUid) {
      return new Response('Not Found', { status: 404 });
    }

    if (isCasesEndpoint) {
      switch (request.method) {
        case 'PUT': return handleAddCases(request, env, userUid);
        case 'DELETE': return handleDeleteCases(request, env, userUid);
        default: return new Response('Method not allowed', {
          status: 405,
          headers: corsHeaders
        });
      }
    }

    // Handle user operations
    switch (request.method) {
      case 'GET': return handleGetUser(env, userUid);
      case 'PUT': return handleAddUser(request, env, userUid);
      case 'DELETE': return handleDeleteUser(env, userUid);
      default: return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }
  }
};