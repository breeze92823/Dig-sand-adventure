// Phones and tablets: a coarse primary pointer with no hover. Evaluated once; the HUD reads
// `isCompact` live (it also covers small desktop windows).
const mq = (q) => typeof matchMedia === 'function' && matchMedia(q).matches
export const isTouch = mq('(pointer: coarse)') && !mq('(hover: hover) and (pointer: fine)')
export const isCompact = () => isTouch || window.innerWidth < 900 || window.innerHeight < 520

// Publishes the viewport to CSS: --W / --H (real px, unlike 100vh this follows the mobile URL bar)
// and html.compact (small / touch screens get the tighter HUD layout in hud.css).
export function installViewport() {
  const root = document.documentElement
  const fit = () => {
    root.classList.toggle('compact', isCompact())
    root.style.setProperty('--W', `${window.innerWidth}px`)
    root.style.setProperty('--H', `${window.innerHeight}px`)
  }
  window.addEventListener('resize', fit)
  window.addEventListener('orientationchange', fit)
  fit()
}
