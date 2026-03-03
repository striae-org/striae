interface Env {
  USER_DB_AUTH: string;
  USER_DB: KVNamespace;
  R2_KEY_SECRET: string;
  IMAGES_API_TOKEN: string;
}

interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  permitted: boolean;
  cases: CaseItem[];
  readOnlyCases?: ReadOnlyCaseItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface CaseItem {
  caseNumber: string;
  caseName?: string;
  [key: string]: any;
}

interface ReadOnlyCaseItem {
  caseNumber: string;
  caseName?: string;
  [key: string]: any;
}

interface UserRequestData {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  permitted?: boolean;
  readOnlyCases?: ReadOnlyCaseItem[];
}

interface AddCasesRequest {
  cases: CaseItem[];
}

interface DeleteCasesRequest {
  casesToDelete: string[];
}

interface CaseData {
  files?: Array<{ id: string; [key: string]: any }>;
  [key: string]: any;
}

interface AccountDeletionProgressEvent {
  event: 'start' | 'case-start' | 'case-complete' | 'complete' | 'error';
  totalCases: number;
  completedCases: number;
  currentCaseNumber?: string;
  success?: boolean;
  message?: string;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

// Worker URLs - configure these for deployment
const DATA_WORKER_URL = 'DATA_WORKER_DOMAIN';

const IMAGE_WORKER_URL = 'IMAGES_WORKER_DOMAIN';

async function authenticate(request: Request, env: Env): Promise<void> {
  const authKey = request.headers.get('X-Custom-Auth-Key');
  if (authKey !== env.USER_DB_AUTH) throw new Error('Unauthorized');
}

async function handleGetUser(env: Env, userUid: string): Promise<Response> {
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

async function handleAddUser(request: Request, env: Env, userUid: string): Promise<Response> {
  try {
    const requestData: UserRequestData = await request.json();
    const { email, firstName, lastName, company, permitted } = requestData;
    
    // Check for existing user
    const value = await env.USER_DB.get(userUid);
    
    let userData: UserData;
    if (value !== null) {
      // Update existing user, preserving cases
      const existing: UserData = JSON.parse(value);
      userData = {
        ...existing,
        // Preserve all existing fields
        email: email || existing.email,
        firstName: firstName || existing.firstName,
        lastName: lastName || existing.lastName,
        company: company || existing.company,
        permitted: permitted !== undefined ? permitted : existing.permitted,
        updatedAt: new Date().toISOString()
      };
      if (requestData.readOnlyCases !== undefined) {
        userData.readOnlyCases = requestData.readOnlyCases;
      }
    } else {
      // Create new user
      userData = {
        uid: userUid,
        email: email || '',
        firstName: firstName || '',
        lastName: lastName || '',
        company: company || '',
        permitted: permitted !== undefined ? permitted : true,
        cases: [],
        createdAt: new Date().toISOString()
      };
      if (requestData.readOnlyCases !== undefined) {
        userData.readOnlyCases = requestData.readOnlyCases;
      }
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

// Function to delete a single case (similar to case-manage.ts deleteCase)
async function deleteSingleCase(env: Env, userUid: string, caseNumber: string): Promise<void> {
  const dataApiKey = env.R2_KEY_SECRET;
  const imageApiKey = env.IMAGES_API_TOKEN;

  try {
    // Get case data from data worker
    const caseResponse = await fetch(`${DATA_WORKER_URL}/${encodeURIComponent(userUid)}/${encodeURIComponent(caseNumber)}/data.json`, {
      headers: { 'X-Custom-Auth-Key': dataApiKey }
    });

    if (!caseResponse.ok) {
      return;
    }

    const caseData: CaseData = await caseResponse.json();

    // Delete all files associated with this case
    if (caseData.files && caseData.files.length > 0) {
      for (const file of caseData.files) {
        try {
          // Delete image file - correct endpoint
          await fetch(`${IMAGE_WORKER_URL}/${encodeURIComponent(file.id)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${imageApiKey}`
            }
          });
          
          // Delete notes file if exists
          await fetch(`${DATA_WORKER_URL}/${encodeURIComponent(userUid)}/${encodeURIComponent(caseNumber)}/${encodeURIComponent(file.id)}/data.json`, {
            method: 'DELETE',
            headers: { 'X-Custom-Auth-Key': dataApiKey }
          });
        } catch (fileError) {
          // Continue with other files
        }
      }
    }

    // Delete the case data file
    await fetch(`${DATA_WORKER_URL}/${encodeURIComponent(userUid)}/${encodeURIComponent(caseNumber)}/data.json`, {
      method: 'DELETE',
      headers: { 'X-Custom-Auth-Key': dataApiKey }
    });

  } catch (error) {
    // Continue with user deletion even if case deletion fails
  }
}

async function executeUserDeletion(
  env: Env,
  userUid: string,
  reportProgress?: (progress: AccountDeletionProgressEvent) => void
): Promise<{ success: boolean; message: string; totalCases: number; completedCases: number }> {
  const userData = await env.USER_DB.get(userUid);
  if (userData === null) {
    throw new Error('User not found');
  }

  const userObject: UserData = JSON.parse(userData);
  const ownedCases = (userObject.cases || []).map((caseItem) => caseItem.caseNumber);
  const readOnlyCases = (userObject.readOnlyCases || []).map((caseItem) => caseItem.caseNumber);
  const allCaseNumbers = [...ownedCases, ...readOnlyCases];
  const totalCases = allCaseNumbers.length;
  let completedCases = 0;

  reportProgress?.({
    event: 'start',
    totalCases,
    completedCases
  });

  for (const caseNumber of allCaseNumbers) {
    reportProgress?.({
      event: 'case-start',
      totalCases,
      completedCases,
      currentCaseNumber: caseNumber
    });

    await deleteSingleCase(env, userUid, caseNumber);
    completedCases += 1;

    reportProgress?.({
      event: 'case-complete',
      totalCases,
      completedCases,
      currentCaseNumber: caseNumber
    });
  }

  // Delete the user account from the database
  await env.USER_DB.delete(userUid);

  return {
    success: true,
    message: 'Account successfully deleted',
    totalCases,
    completedCases
  };
}

async function handleDeleteUser(env: Env, userUid: string): Promise<Response> {
  try {
    const result = await executeUserDeletion(env, userUid);
    
    return new Response(JSON.stringify({
      success: result.success,
      message: result.message
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (errorMessage === 'User not found') {
      return new Response('User not found', {
        status: 404,
        headers: corsHeaders
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete user account'
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

function handleDeleteUserWithProgress(env: Env, userUid: string): Response {
  const sseHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive'
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (payload: AccountDeletionProgressEvent) => {
        controller.enqueue(encoder.encode(`event: ${payload.event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const result = await executeUserDeletion(env, userUid, sendEvent);
        sendEvent({
          event: 'complete',
          totalCases: result.totalCases,
          completedCases: result.completedCases,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete user account';

        sendEvent({
          event: 'error',
          totalCases: 0,
          completedCases: 0,
          success: false,
          message: errorMessage
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: sseHeaders
  });
}

async function handleAddCases(request: Request, env: Env, userUid: string): Promise<Response> {
  try {
    const { cases = [] }: AddCasesRequest = await request.json();
    
    // Get current user data
    const value = await env.USER_DB.get(userUid);
    if (!value) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update cases
    const userData: UserData = JSON.parse(value);
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

async function handleDeleteCases(request: Request, env: Env, userUid: string): Promise<Response> {
  try {
    const { casesToDelete }: DeleteCasesRequest = await request.json();
    
    // Get current user data
    const value = await env.USER_DB.get(userUid);
    if (!value) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update user data
    const userData: UserData = JSON.parse(value);
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
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      await authenticate(request, env);
      
      const url = new URL(request.url);
      const parts = url.pathname.split('/');
      const userUid = parts[1];
      const isCasesEndpoint = parts[2] === 'cases';
      
      if (!userUid) {
        return new Response('Not Found', { status: 404 });
      }

      // Handle regular cases endpoint
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
      const acceptsEventStream = request.headers.get('Accept')?.includes('text/event-stream') === true;
      const streamProgress = url.searchParams.get('stream') === 'true' || acceptsEventStream;

      switch (request.method) {
        case 'GET': return handleGetUser(env, userUid);
        case 'PUT': return handleAddUser(request, env, userUid);
        case 'DELETE': return streamProgress ? handleDeleteUserWithProgress(env, userUid) : handleDeleteUser(env, userUid);
        default: return new Response('Method not allowed', {
          status: 405,
          headers: corsHeaders
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage === 'Unauthorized') {
        return new Response('Forbidden', { 
          status: 403, 
          headers: corsHeaders 
        });
      }
      
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};