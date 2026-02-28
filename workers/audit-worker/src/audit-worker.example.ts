interface Env {
  R2_KEY_SECRET: string;
  STRIAE_AUDIT: R2Bucket;
}

interface AuditEntry {
  timestamp: string;
  userId: string;
  action: string;
  // Optional metadata fields that can be included
  [key: string]: any;
}

interface SuccessResponse {
  success: boolean;
  entryCount?: number;
  filename?: string;
}

interface ErrorResponse {
  error: string;
}

interface AuditRetrievalResponse {
  entries: AuditEntry[];
  total: number;
}

type APIResponse = SuccessResponse | ErrorResponse | AuditRetrievalResponse;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

const createResponse = (data: APIResponse, status: number = 200): Response => new Response(
  JSON.stringify(data), 
  { status, headers: corsHeaders }
);

const hasValidHeader = (request: Request, env: Env): boolean => 
  request.headers.get("X-Custom-Auth-Key") === env.R2_KEY_SECRET;

// Helper function to generate audit file names with user and date
const generateAuditFileName = (userId: string): string => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `audit-trails/${userId}/${date}.json`;
};

// Helper function to append audit entry to existing file
const appendAuditEntry = async (bucket: R2Bucket, filename: string, newEntry: AuditEntry): Promise<number> => {
  try {
    const existingFile = await bucket.get(filename);
    let entries: AuditEntry[] = [];
    
    if (existingFile) {
      const existingData = await existingFile.text();
      entries = JSON.parse(existingData);
    }
    
    entries.push(newEntry);
    await bucket.put(filename, JSON.stringify(entries));
    return entries.length;
  } catch (error) {
    console.error('Error appending audit entry:', error);
    throw error;
  }
};

// Type guard to validate audit entry structure
const isValidAuditEntry = (entry: any): entry is AuditEntry => {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.timestamp === 'string' &&
    typeof entry.userId === 'string' &&
    typeof entry.action === 'string'
  );
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {       
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (!hasValidHeader(request, env)) {
      return createResponse({ error: 'Forbidden' }, 403);
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const bucket = env.STRIAE_AUDIT;

      // This worker only handles audit trail endpoints
      if (!pathname.startsWith('/audit/')) {
        return createResponse({ error: 'This worker only handles audit endpoints. Use /audit/ path.' }, 404);
      }

      const userId = url.searchParams.get('userId');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      
      if (request.method === 'POST') {
        // Add audit entry
        if (!userId) {
          return createResponse({ error: 'userId parameter is required' }, 400);
        }
        
        const auditEntry: unknown = await request.json();
        
        // Validate audit entry structure using type guard
        if (!isValidAuditEntry(auditEntry)) {
          return createResponse({ error: 'Invalid audit entry structure. Required fields: timestamp, userId, action' }, 400);
        }
        
        const filename = generateAuditFileName(userId);
        
        try {
          const entryCount = await appendAuditEntry(bucket, filename, auditEntry);
          return createResponse({ 
            success: true, 
            entryCount,
            filename 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          return createResponse({ error: `Failed to store audit entry: ${errorMessage}` }, 500);
        }
      }
      
      if (request.method === 'GET') {
        // Retrieve audit entries
        if (!userId) {
          return createResponse({ error: 'userId parameter is required' }, 400);
        }
        
        try {
          let allEntries: AuditEntry[] = [];
          
          if (startDate && endDate) {
            // Get entries for date range
            const start = new Date(startDate);
            const end = new Date(endDate);
            const currentDate = new Date(start);
            
            while (currentDate <= end) {
              const dateStr = currentDate.toISOString().split('T')[0];
              const filename = `audit-trails/${userId}/${dateStr}.json`;
              const file = await bucket.get(filename);
              
              if (file) {
                const fileText = await file.text();
                const entries: AuditEntry[] = JSON.parse(fileText);
                allEntries.push(...entries);
              }
              
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } else {
            // Get today's entries
            const filename = generateAuditFileName(userId);
            const file = await bucket.get(filename);
            
            if (file) {
              const fileText = await file.text();
              allEntries = JSON.parse(fileText);
            }
          }
          
          // Sort by timestamp (newest first)
          allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          return createResponse({
            entries: allEntries,
            total: allEntries.length
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          return createResponse({ error: `Failed to retrieve audit entries: ${errorMessage}` }, 500);
        }
      }
      
      return createResponse({ error: 'Method not allowed for audit endpoints. Only GET and POST are supported.' }, 405);

    } catch (error) {
      console.error('Audit Worker error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return createResponse({ error: errorMessage }, 500);
    }
  }
};