import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from "react"
import { useMMKVString } from "react-native-mmkv"

import { storage } from "@/utils/storage"

const FAVOURITES_KEY = "FavouritesProvider.codes"

function parseCodes(raw?: string): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

export type FavouritesContextType = {
  codes: string[]
  hasFavourite: (code: string) => boolean
  toggleFavourite: (code: string) => void
}

export const FavouritesContext = createContext<FavouritesContextType | null>(null)

export const FavouritesProvider: FC<PropsWithChildren> = ({ children }) => {
  const [raw, setRaw] = useMMKVString(FAVOURITES_KEY, storage)
  const codes = useMemo(() => parseCodes(raw), [raw])

  const hasFavourite = useCallback((code: string) => codes.includes(code), [codes])

  const toggleFavourite = useCallback(
    (code: string) => {
      const next = codes.includes(code)
        ? codes.filter((item) => item !== code)
        : [...codes, code]
      setRaw(JSON.stringify(next))
    },
    [codes, setRaw],
  )

  const value = useMemo(
    () => ({ codes, hasFavourite, toggleFavourite }),
    [codes, hasFavourite, toggleFavourite],
  )

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export const useFavourites = () => {
  const context = useContext(FavouritesContext)
  if (!context) throw new Error("useFavourites must be used within a FavouritesProvider")
  return context
}
