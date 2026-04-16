'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Perfil, RolUsuario } from '@/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  perfil: Perfil | null
  loading: boolean
  rol: RolUsuario | null
  isAdmin: boolean
  isLider: boolean
  hasAccess: (unidadId: string) => boolean
  signOut: () => Promise<void>
  refreshPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  perfil: null,
  loading: true,
  rol: null,
  isAdmin: false,
  isLider: false,
  hasAccess: () => false,
  signOut: async () => {},
  refreshPerfil: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('perfiles')
      .select('*, empresa:empresas(id, nombre, codigo)')
      .eq('id', userId)
      .single()
    if (data) setPerfil({ ...data, nombre_completo: `${data.nombre} ${data.apellido}` })
  }, [supabase])

  const refreshPerfil = useCallback(async () => {
    if (user) await fetchPerfil(user.id)
  }, [user, fetchPerfil])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchPerfil])

  const signOut = async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const hasAccess = (unidadId: string) => {
    if (!perfil) return false
    if (perfil.rol === 'admin') return true
    return perfil.unidades_acceso.includes(unidadId)
  }

  return (
    <AuthContext.Provider value={{
      user, session, perfil, loading,
      rol: perfil?.rol ?? null,
      isAdmin: perfil?.rol === 'admin',
      isLider: perfil?.rol === 'lider' || perfil?.rol === 'admin',
      hasAccess,
      signOut,
      refreshPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
