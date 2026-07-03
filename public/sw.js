self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json()
    let rawUrl = data.url || 'https://chefsy.xyz/cadeteria'
    let absoluteUrl = rawUrl.startsWith('http')
      ? (rawUrl.includes('chefsy.xyz') ? rawUrl : `https://chefsy.xyz${new URL(rawUrl).pathname}`)
      : `https://chefsy.xyz${rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl}`

    const options = {
      body: data.body || '¡Tenés un nuevo pedido listo para entregar!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
        url: absoluteUrl,
      },
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Chefsy - Cadetería', options)
    )
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  let targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : 'https://chefsy.xyz/cadeteria'

  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://chefsy.xyz' + (targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl)
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i]
        if (client.url && client.url.includes('chefsy.xyz') && 'focus' in client) {
          if (client.navigate && client.url !== targetUrl) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
