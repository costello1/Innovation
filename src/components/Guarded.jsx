import React from 'react'
import { Navigate } from 'react-router-dom'
import { routes } from '../utils/routes'

// semplice guard per admin (stato passato come prop)
export default function Guarded({ isAuthed, children }) {
  if (!isAuthed) return <Navigate to={routes.admin} replace />
  return children
}
