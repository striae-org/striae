interface Env {
  USER_DB_AUTH: string;
  USER_DB: KVNamespace;
  R2_KEY_SECRET: string;
  IMAGES_API_TOKEN: string;
  SL_API_KEY: string;
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

interface EmailRecipient {
  name: string;
  email: string;
}

interface EmailData {
  from: EmailRecipient;
  to: EmailRecipient[];
  subject: string;
  ContentType: string;
  HTMLContent: string;
  PlainContent: string;
  Tags: string[];
  Headers: Record<string, string>;
}

interface AccountDeletionProgressEvent {
  event: 'start' | 'case-start' | 'case-complete' | 'email-sent' | 'complete' | 'error';
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

/**
 * Escapes HTML special characters to prevent injection attacks in email content
 * 
 * @param text - Raw user input that may contain HTML characters
 * @returns Safely escaped string suitable for embedding in HTML
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
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

async function sendDeletionEmails(env: Env, userData: UserData): Promise<boolean> {
  try {
    const { uid, email, firstName, lastName, company } = userData;
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
    
    // Email to the user
    const userEmailData: EmailData = {
      from: {
        name: "Striae Account Services",
        email: "info@striae.org"
      },
      to: [
        {
          name: fullName,
          email: email
        }
      ],
      subject: "Striae Account Deletion Confirmation",
      ContentType: "HTML",
      HTMLContent: `<html><body>
        <h2>Account Deletion Confirmation</h2>
        <p>Dear ${escapeHtml(fullName)},</p>
        <p>This email confirms that your Striae account has been successfully deleted.</p>
        <p><strong>Account Details:</strong></p>
        <ul>
          <li><strong>UID:</strong> ${escapeHtml(uid)}</li>
          <li><strong>Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Lab/Company:</strong> ${escapeHtml(company || 'Not provided')}</li>
        </ul>
        <p>All your account information and data have been permanently removed from our systems. The account associated with this email address has been disabled.</p>
        <p>If you did not request this deletion or believe this was done in error, please contact our support team immediately at info@striae.org.</p>
        <p>Thank you for using Striae.</p>
        <p>Best regards,<br>The Striae Team</p>
      </body></html>`,
      PlainContent: `Account Deletion Confirmation

Dear ${fullName},

This email confirms that your Striae account has been successfully deleted.

Account Details:
- UID: ${uid}
- Email: ${email}
- Lab/Company: ${company || 'Not provided'}

All your account information and data have been permanently removed from our systems. The account associated with this email address has been disabled.

If you did not request this deletion or believe this was done in error, please contact our support team immediately at info@striae.org.

Thank you for using Striae.

Best regards,
The Striae Team`,
      Tags: ["account-deletion"],
      Headers: {
        "X-Mailer": "striae.org"
      }
    };

    const userEmailResponse = await fetch('https://console.sendlayer.com/api/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SL_API_KEY}`,
      },
      body: JSON.stringify(userEmailData),
    });

    // Email to support
    const supportEmailData: EmailData = {
      from: {
        name: "Striae Account Services",
        email: "info@striae.org"
      },
      to: [
        {
          name: "Striae Support",
          email: "info@striae.org"
        }
      ],
      subject: "Account Deletion Notification",
      ContentType: "HTML",
      HTMLContent: `<html><body>
        <h2>Account Deletion Notification</h2>
        <p>A user has deleted their Striae account.</p>
        <p><strong>Deleted Account Details:</strong></p>
        <ul>
          <li><strong>UID:</strong> ${escapeHtml(uid)}</li>
          <li><strong>Name:</strong> ${escapeHtml(fullName)}</li>
          <li><strong>Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Lab/Company:</strong> ${escapeHtml(company || 'Not provided')}</li>
          <li><strong>Deletion Time:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p>The user has been sent a confirmation email.</p>
      </body></html>`,
      PlainContent: `Account Deletion Notification

A user has deleted their Striae account.

Deleted Account Details:
- UID: ${uid}
- Name: ${fullName}
- Email: ${email}
- Lab/Company: ${company || 'Not provided'}
- Deletion Time: ${new Date().toISOString()}

The user has been sent a confirmation email.`,
      Tags: ["account-deletion", "admin-notification"],
      Headers: {
        "X-Mailer": "striae.org"
      }
    };

    const supportEmailResponse = await fetch('https://console.sendlayer.com/api/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SL_API_KEY}`,
      },
      body: JSON.stringify(supportEmailData),
    });

    if (!userEmailResponse.ok || !supportEmailResponse.ok) {
      throw new Error('Failed to send deletion emails');
    }

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
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
  // First, get the user data to include in the deletion emails
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

  // Send deletion emails before deleting the account
  await sendDeletionEmails(env, userObject);

  reportProgress?.({
    event: 'email-sent',
    totalCases,
    completedCases
  });

  // Delete the user account from the database
  await env.USER_DB.delete(userUid);

  return {
    success: true,
    message: 'Account successfully deleted and confirmation emails sent',
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
    
    // If it's an email error, we might want to still delete the account
    // and just log the email failure, or handle it differently based on requirements
    if (errorMessage.includes('email')) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Account deletion failed: Unable to send confirmation emails'
      }), { 
        status: 500, 
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