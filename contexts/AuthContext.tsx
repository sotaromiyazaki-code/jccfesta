'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  userName: string | null
  userTeams: string[]
  isAuthenticated: boolean
  isLoaded: boolean
  login: (passphrase: string, name: string, teams: string[]) => boolean
  updateTeams: (teams: string[]) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null)
  const [userTeams, setUserTeamsState] = useState<string[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const storedAuth = localStorage.getItem('jcc_authenticated')
    const storedName = localStorage.getItem('jcc_user_name')
    const storedTeams = localStorage.getItem('jcc_user_teams')
    if (storedAuth === 'true' && storedName) {
      setIsAuthenticated(true)
      setUserName(storedName)
      const teams = storedTeams ? JSON.parse(storedTeams) : []
      setUserTeamsState(teams)
      recordLogin(storedName, teams)
    }
    setIsLoaded(true)
  }, [])

  const recordLogin = (name: string, teams: string[]) => {
    supabase.from('user_logins').upsert(
      { user_name: name, teams, last_login_at: new Date().toISOString() },
      { onConflict: 'user_name', ignoreDuplicates: false }
    ).then(() => {})
  }

  const login = (passphrase: string, name: string, teams: string[]): boolean => {
    const correctPassphrase = process.env.NEXT_PUBLIC_PASSPHRASE
    if (passphrase === correctPassphrase && name.trim()) {
      localStorage.setItem('jcc_authenticated', 'true')
      localStorage.setItem('jcc_user_name', name.trim())
      localStorage.setItem('jcc_user_teams', JSON.stringify(teams))
      setIsAuthenticated(true)
      setUserName(name.trim())
      setUserTeamsState(teams)
      recordLogin(name.trim(), teams)
      return true
    }
    return false
  }

  const updateTeams = (teams: string[]) => {
    localStorage.setItem('jcc_user_teams', JSON.stringify(teams))
    setUserTeamsState(teams)
    if (userName) {
      supabase.from('user_logins').update({ teams }).eq('user_name', userName).then(() => {})
    }
  }

  const logout = () => {
    localStorage.removeItem('jcc_authenticated')
    localStorage.removeItem('jcc_user_name')
    localStorage.removeItem('jcc_user_teams')
    setIsAuthenticated(false)
    setUserName(null)
    setUserTeamsState([])
  }

  return (
    <AuthContext.Provider value={{ userName, userTeams, isAuthenticated, isLoaded, login, updateTeams, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
