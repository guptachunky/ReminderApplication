// This file is kept for backward compatibility
// It re-exports from the separated client and server files

import { createClient } from './supabase-client'
export { createClient }

// Export the Database type
export type { Database } from './database-types'

// Note: Server components should import directly from supabase-server.ts
// This avoids the "You're importing a component that needs next/headers" error
