import 'server-only'
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

let app: App
let auth: Auth

function getAdminApp(): App {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0]!
    } else {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey)
        app = initializeApp({ credential: cert(serviceAccount) })
      } else {
        // Fallback: use application default credentials
        app = initializeApp()
      }
    }
  }
  return app
}

export function getAdminAuth(): Auth {
  if (!auth) {
    auth = getAuth(getAdminApp())
  }
  return auth
}
