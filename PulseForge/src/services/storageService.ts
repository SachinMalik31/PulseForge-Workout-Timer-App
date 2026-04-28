import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@config/firebase'
import { userService } from '@services/userService'
import type { ServiceResult } from '@types'

export const storageService = {
  async uploadProfileImage(
    uid: string,
    uri: string
  ): Promise<ServiceResult<string>> {
    try {
      const response = await fetch(uri)
      const blob = await response.blob()

      const storageRef = ref(storage, `profileImages/${uid}`)
      await uploadBytes(storageRef, blob)

      const downloadURL = await getDownloadURL(storageRef)

      await userService.updateUserDoc(uid, { photoURL: downloadURL })

      return { data: downloadURL, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload image'
      return { data: null, error: message }
    }
  },
}
