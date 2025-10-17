export const routes = {
  home: '/',
  admin: '/admin',
  vote: (surveyId='default') => `/vote/${surveyId}`,
  results: (surveyId='default') => `/results/${surveyId}`,
  qr: (surveyId='default') => `/qr/${surveyId}`,
  thanks: '/thanks', // <--- NEW
}
