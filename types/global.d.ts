// Global augmentation for wallet state shared between React and Phaser
interface Window {
  __walletAddress: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ethereum?: Record<string, any>
}
