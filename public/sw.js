self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body || '¡Tenés un nuevo pedido listo para entregar!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
        url: data.url || '/cadeteria',
      },
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Chefsy - Cadetería', options)
    )
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})
