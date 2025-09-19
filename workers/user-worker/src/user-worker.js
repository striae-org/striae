const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dev.striae.org',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

// Worker URLs - configure these for deployment
const DATA_WORKER_URL = 'https://data.dev.striae.org';
const IMAGE_WORKER_URL = 'https://images.dev.striae.org';

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

async function sendDeletionEmails(env, userData) {
  try {
    const { uid, email, firstName, lastName, company } = userData;
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
    
    // Email to the user
    const userEmailResponse = await fetch('https://console.sendlayer.com/api/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SL_API_KEY}`,
      },
      body: JSON.stringify({
        "from": {
          "name": "Striae Account Services",
          "email": "no-reply@striae.org"
        },
        "to": [
          {
            "name": fullName,
            "email": email
          }
        ],
        "subject": "Striae Account Deletion Confirmation",
        "ContentType": "HTML",
        "HTMLContent": `<html><body>
          <h2>Account Deletion Confirmation</h2>
          <p>Dear ${fullName},</p>
          <p>This email confirms that your Striae account has been successfully deleted.</p>
          <p><strong>Account Details:</strong></p>
          <ul>
            <li><strong>UID:</strong> ${uid}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Lab/Company:</strong> ${company || 'Not provided'}</li>
          </ul>
          <p>All your account information and data have been permanently removed from our systems. The account associated with this email address has been disabled.</p>
          <p>If you did not request this deletion or believe this was done in error, please contact our support team immediately at info@striae.org.</p>
          <p>Thank you for using Striae.</p>
          <p>Best regards,<br>The Striae Team</p>
        </body></html>`,
        "PlainContent": `Account Deletion Confirmation

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
        "Tags": ["account-deletion"],
        "Headers": {
          "X-Mailer": "striae.org"
        }
      }),
    });

    // Email to support
    const supportEmailResponse = await fetch('https://console.sendlayer.com/api/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SL_API_KEY}`,
      },
      body: JSON.stringify({
        "from": {
          "name": "Striae Account Services",
          "email": "no-reply@striae.org"
        },
        "to": [
          {
            "name": "Striae Support",
            "email": "info@striae.org"
          }
        ],
        "subject": "Account Deletion Notification",
        "ContentType": "HTML",
        "HTMLContent": `<html><body>
          <h2>Account Deletion Notification</h2>
          <p>A user has deleted their Striae account.</p>
          <p><strong>Deleted Account Details:</strong></p>
          <ul>
            <li><strong>UID:</strong> ${uid}</li>
            <li><strong>Name:</strong> ${fullName}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Lab/Company:</strong> ${company || 'Not provided'}</li>
            <li><strong>Deletion Time:</strong> ${new Date().toISOString()}</li>
          </ul>
          <p>The user has been sent a confirmation email.</p>
        </body></html>`,
        "PlainContent": `Account Deletion Notification

A user has deleted their Striae account.

Deleted Account Details:
- UID: ${uid}
- Name: ${fullName}
- Email: ${email}
- Lab/Company: ${company || 'Not provided'}
- Deletion Time: ${new Date().toISOString()}

The user has been sent a confirmation email.`,
        "Tags": ["account-deletion", "admin-notification"],
        "Headers": {
          "X-Mailer": "striae.org"
        }
      }),
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
async function deleteSingleCase(env, userUid, caseNumber) {
  const dataApiKey = env.R2_KEY_SECRET;
  const imageApiKey = env.IMAGES_API_TOKEN;

  try {
    // Get case data from data worker
    const caseResponse = await fetch(`${DATA_WORKER_URL}/${userUid}/${caseNumber}/data.json`, {
      headers: { 'X-Custom-Auth-Key': dataApiKey }
    });

    if (!caseResponse.ok) {
      console.warn(`Case ${caseNumber} not found in data worker`);
      return;
    }

    const caseData = await caseResponse.json();

    // Delete all files associated with this case
    if (caseData.files && caseData.files.length > 0) {
      for (const file of caseData.files) {
        try {
          // Delete image file - correct endpoint
          await fetch(`${IMAGE_WORKER_URL}/${file.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${imageApiKey}`
            }
          });
          
          // Delete notes file if exists
          await fetch(`${DATA_WORKER_URL}/${userUid}/${caseNumber}/${file.id}/data.json`, {
            method: 'DELETE',
            headers: { 'X-Custom-Auth-Key': dataApiKey }
          });
        } catch (fileError) {
          console.warn(`Failed to delete file ${file.id} for case ${caseNumber}:`, fileError);
        }
      }
    }

    // Delete the case data file
    await fetch(`${DATA_WORKER_URL}/${userUid}/${caseNumber}/data.json`, {
      method: 'DELETE',
      headers: { 'X-Custom-Auth-Key': dataApiKey }
    });

  } catch (error) {
    console.warn(`Failed to delete case ${caseNumber}:`, error);
  }
}

async function handleDeleteUser(env, userUid) {
  try {
    // First, get the user data to include in the deletion emails
    const userData = await env.USER_DB.get(userUid);
    if (userData === null) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    const userObject = JSON.parse(userData);
    
    // Delete all user's cases using the same logic as case-manage.ts
    if (userObject.cases && userObject.cases.length > 0) {
      console.log(`Deleting ${userObject.cases.length} cases for user ${userUid}`);
      
      for (const caseItem of userObject.cases) {
        await deleteSingleCase(env, userUid, caseItem.caseNumber);
      }
    }
    
    // Send deletion emails before deleting the account
    await sendDeletionEmails(env, userObject);
    
    // Delete the user account from the database
    await env.USER_DB.delete(userUid);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Account successfully deleted and confirmation emails sent'
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    // If it's an email error, we might want to still delete the account
    // and just log the email failure, or handle it differently based on requirements
    if (error.message.includes('email')) {
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