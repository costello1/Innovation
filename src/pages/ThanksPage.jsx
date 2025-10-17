import React from 'react'
import { Link } from 'react-router-dom'
import { routes } from '../utils/routes'
import s from '../styles/ThankYou.module.css'

export default function ThankYou() {
  return (
    <div className={s.wrap}>
      <section className={s.card}>
        <h1 className={s.title}>Thank you for your vote! 🎉</h1>
        <p className={s.subtitle}>
          Your choice has been recorded for this round.
        </p>

        <div className={s.actions}>
          <Link to={routes.results('any')} className={`${s.btn} ${s.primary}`}>
            View Live Results
          </Link>
          <Link to={routes.home} className={`${s.btn} ${s.ghost}`}>
            Back to Home
          </Link>
        </div>
      </section>
    </div>
  )
}
