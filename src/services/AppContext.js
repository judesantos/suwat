import { createContext } from 'react'

const AppContext = createContext()

export const AppCtxProvider = AppContext.Provider
export const AppCtxConsumer = AppContext.Consumer

export default AppContext