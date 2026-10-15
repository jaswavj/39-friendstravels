import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { clearSessionLogoutArtifacts } from '../../../utils/sessionLogoutUtil'

interface Login {
    authorized: boolean
    id: number
    name: string
    userName: string
    fullName: string
    accessToken: string
    discPer: number
    moduleIds: number[]
}

const initialState: Login = {
    authorized: false,
    id: 0,
    name: '',
    userName: '',
    fullName: '',
    accessToken: '',
    discPer: 100,
    moduleIds: [],
}

export const loginSlice = createSlice({
    name: 'Login',
    initialState,
    reducers: {
        saveLoginDataAction: (state, { payload }: PayloadAction<Partial<Login>>) => {
            return { ...state, ...payload, authorized: true }
        },
        authLogout: (state) => {
            clearSessionLogoutArtifacts();
            return { ...state, ...initialState }
        }
    }
})

export const { saveLoginDataAction, authLogout } = loginSlice.actions

export default loginSlice.reducer
