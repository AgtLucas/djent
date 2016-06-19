import { extendObjectArrayByID, updateObjByID } from '../utils/tools';

const initialState =  {
    isActive: false,
    content: '',
    isCloseable: true,
}

export default function beats(state = initialState, action) {
    let { type, payload } = action;

    switch (type) {
        case 'ENABLE_MODAL':
            return {
                ...state,
                isActive: true,
                content: payload.content,
                isCloseable: payload.isCloseable,
            }

        case 'DISABLE_MODAL':
            return { ...state, isActive: false }

        default:
            return state;
  }
}
