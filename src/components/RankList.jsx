import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './RankList.css'

export default function RankList({ items }) {
  return (
    <div className="rank-wrap">
      <AnimatePresence>
        {items.map((it, i) => (
          <motion.div
            key={it.id}
            layout
            initial={{opacity:0, y:10}}
            animate={{opacity:1, y:0}}
            exit={{opacity:0, y:-10}}
            transition={{type:'spring', stiffness:500, damping:40}}
            className="rank-item"
          >
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="rank-pos">{i+1}</div>
              <div style={{fontWeight:600}}>{it.label}</div>
            </div>
            <div style={{fontVariantNumeric:'tabular-nums', fontWeight:700}}>
              {it.count}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
