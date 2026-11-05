/** Shows a desktop notification, using the service worker where the page API is unavailable. */
export async function desktopNotify(args: {
  title: string
  body: string
  tag: string
  url: string
}): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return
  try {
    const notification = new Notification(args.title, { body: args.body, tag: args.tag })
    notification.onclick = () => {
      window.focus()
      window.location.assign(args.url)
      notification.close()
    }
    return
  } catch {
    // Android Chrome only allows notifications from a service worker.
  }
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    await registration?.showNotification(args.title, {
      body: args.body,
      tag: args.tag,
      data: { url: args.url },
    })
  } catch {
    // Alerts are best effort; the Inbox still holds the item.
  }
}

export function softBeep(): void {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = "sine"
    oscillator.frequency.value = 740
    gain.gain.value = 0.035
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.07)
    oscillator.onended = () => void context.close()
  } catch {
    // Autoplay policies can block audio until the user interacts.
  }
}
