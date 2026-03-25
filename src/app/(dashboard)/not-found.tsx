import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">المتجر غير موجود</h2>
        <p className="text-gray-600 mb-6">
          لم يتم العثور على المتجر المطلوب. تأكد من الرابط أو أنشئ متجرك الآن.
        </p>
        <Link
          href="/onboarding"
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          إنشاء متجر جديد
        </Link>
      </div>
    </div>
  )
}
