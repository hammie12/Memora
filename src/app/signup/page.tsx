import CustomAuthForm from '@/components/CustomAuthForm'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white/80 backdrop-blur-md rounded-xl shadow-2xl dark:bg-gray-900/80">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Create Your Account
        </h2>
        <CustomAuthForm initialView="sign_up" />
      </div>
    </div>
  )
} 