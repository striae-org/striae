import { handleFileDelete } from './handlers/delete-file';
import { handleSignedUrlMinting } from './handlers/mint-signed-url';
import { handleFileServing } from './handlers/serve-file';
import { handleFileUpload } from './handlers/upload-file';
import type { CreateResponse, Env } from './types';
import { parsePathSegments } from './utils/path-utils';

export async function routeFilesWorkerRequest(
  request: Request,
  env: Env,
  respond: CreateResponse
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const pathSegments = parsePathSegments(requestUrl.pathname);
  if (!pathSegments) {
    return respond({ error: 'Invalid files path encoding' }, 400);
  }

  switch (request.method) {
    case 'POST': {
      if (pathSegments.length === 0) {
        return handleFileUpload(request, env, respond);
      }

      if (pathSegments.length === 2 && pathSegments[1] === 'signed-url') {
        return handleSignedUrlMinting(request, env, pathSegments[0], respond);
      }

      return respond({ error: 'Not found' }, 404);
    }

    case 'GET': {
      const fileId = pathSegments.length === 1 ? pathSegments[0] : null;
      if (!fileId) {
        return respond({ error: 'File ID is required' }, 400);
      }

      return handleFileServing(request, env, fileId, respond);
    }

    case 'DELETE': {
      if (pathSegments.length !== 1) {
        return respond({ error: 'Not found' }, 404);
      }

      return handleFileDelete(request, env, respond);
    }

    default:
      return respond({ error: 'Method not allowed' }, 405);
  }
}