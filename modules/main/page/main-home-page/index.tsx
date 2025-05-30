import * as motion from 'motion/react-client'
import BioSection from './internal/bio-section'
import EchoCard from './internal/echo-card'
import TechStack from './internal/tech-stack'
import YeAvatar from './internal/ye-avatar'

export default function MainLayoutContainer() {
  return (
    <motion.main
      className="flex flex-col justify-center items-center gap-6 py-4 overflow-hidden"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: [-10, 0] }}
      transition={{
        duration: 0.6,
        ease: 'easeOut',
      }}
    >
      <YeAvatar />
      <BioSection />
      <EchoCard />
      <TechStack />
    </motion.main>
  )
}
