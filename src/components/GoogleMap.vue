<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  location: {
    type: Object,
    required: true,
    validator: (value) => value && typeof value.lat === 'number' && typeof value.lng === 'number'
  },
  apiKey: {
    type: String,
    required: true
  },
  zoom: {
    type: Number,
    default: 15
  }
})

const mapContainer = ref(null)
let map = null
let marker = null

const initMap = () => {
  map = new google.maps.Map(mapContainer.value, {
    center: props.location,
    zoom: props.zoom
  })

  marker = new google.maps.Marker({
    position: props.location,
    map: map
  })
}

const updateLocation = (newLocation) => {
  if (map && marker) {
    map.setCenter(newLocation)
    marker.setPosition(newLocation)
  }
}

const loadGoogleMapsAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${props.apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps API'))

    document.head.appendChild(script)
  })
}

onMounted(async () => {
  try {
    await loadGoogleMapsAPI()
    initMap()
  } catch (error) {
    console.error('Error loading Google Maps:', error)
  }
})

watch(() => props.location, updateLocation, { deep: true })

watch(() => props.zoom, (newZoom) => {
  if (map) {
    map.setZoom(newZoom)
  }
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
}
</style>