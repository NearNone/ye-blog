'use client'

import { getAllEchos } from '@/actions/echos'
import Loading from '@/components/shared/loading'
import { useStoreLoader } from '@/hooks/use-store-loader'
import { useEchoStore } from '@/store/use-echo-store'
import { motion } from 'motion/react'
import { DataTable } from './data-table'
import { columns } from './echo-table-column'

export default function EchoListTable() {
  const { echos, setEchos } = useEchoStore()
  const { data, error, loading } = useStoreLoader(getAllEchos, setEchos, echos)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        加载出错...
      </div>
    )
  }

  return (
    <motion.main
      className="flex-1"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 20,
      }}
    >
      <DataTable columns={columns} data={data} />
    </motion.main>
  )
}
