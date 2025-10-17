import Cookies from 'js-cookie'

// cookie per voto singolo per survey+round
export const voteCookieKey = (surveyId, round) => `voted_${surveyId}_${round}`

export const getVoteToken = (surveyId, round) => Cookies.get(voteCookieKey(surveyId, round))
export const setVoteToken = (surveyId, round, token) =>
  Cookies.set(voteCookieKey(surveyId, round), token, { expires: 365 })
export const clearAllVotesCookies = () => {
  Object.keys(Cookies.get()).forEach(k => {
    if (k.startsWith('voted_')) Cookies.remove(k)
  })
}