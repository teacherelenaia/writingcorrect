export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const claseId = url.searchParams.get('clase_id') || '';
  const userId = url.searchParams.get('user_id') || '';

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = 'https://writingcorrect.com/api/google-callback';

  const scopes = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
  ].join(' ');

  const state = JSON.stringify({ clase_id: claseId, user_id: userId });
  const stateEncoded = btoa(state);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'online');
  authUrl.searchParams.set('state', stateEncoded);
  authUrl.searchParams.set('prompt', 'select_account');

  return Response.redirect(authUrl.toString(), 302);
}
