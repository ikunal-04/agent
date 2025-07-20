import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <Image
          src="/new-bg.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      <SignIn />
    </div>
  )
}