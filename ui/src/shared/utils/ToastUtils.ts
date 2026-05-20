import {toast} from 'react-toastify'

export function toastError(message: string) {
  toast.error(message)
}

export function toastInfo(message: string) {
  toast.info(message, {icon: false})
}

export function toastWarn(message: string) {
  toast.warn(message)
}
