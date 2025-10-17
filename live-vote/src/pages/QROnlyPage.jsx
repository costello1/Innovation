import React from 'react'
import s from '../styles/QROnlyPage.module.css'

export default function QRPage() {
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <h2 style={{marginTop:0, fontWeight:800, textAlign:'center'}}>Scan to Vote</h2>
        {/* Placeholder image — replace with your QR later */}
        <img
          className={s.image}
          src="https://images.unsplash.com/photo-1520975922215-230f54f76bc3?q=80&w=1200&auto=format&fit=crop"
          alt="QR Code placeholder"
        />
      </div>
    </div>
  )
}
