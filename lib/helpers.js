// lib/helpers.js

/**
 * Serializes car data to ensure it's in the correct format
 * @param {Object} car - The car data to serialize
 * @returns {Object} - The serialized car data
 */
export function serializeCarData(car) {
    if (!car) return null;
    
    // If car is already an array of cars, serialize each one
    if (Array.isArray(car)) {
      return car.map(singleCar => serializeCarData(singleCar));
    }
    
    // Handle Supabase timestamps, convert to ISO string if they exist
    const created_at = car.created_at instanceof Date ? car.created_at.toISOString() : car.created_at;
    const updated_at = car.updated_at instanceof Date ? car.updated_at.toISOString() : car.updated_at;
    
    // Create a new object with all the car properties
    return {
      ...car,
      created_at,
      updated_at,
      // Ensure price is a number
      price: typeof car.price === 'string' ? parseFloat(car.price) : car.price,
      // Ensure year is a number
      year: typeof car.year === 'string' ? parseInt(car.year, 10) : car.year,
      // Parse JSON fields if they're stored as strings
      features: typeof car.features === 'string' ? JSON.parse(car.features) : car.features || [],
      // Ensure images is always an array
      images: car.images || []
    };
  }
  
  /**
   * Format price with currency symbol and thousands separators
   * @param {number} price - The price to format
   * @param {string} currency - The currency symbol to use (default: $)
   * @returns {string} - The formatted price
   */
  export function formatPrice(price, currency = '$') {
    return `${currency}${price?.toLocaleString() || '0'}`;
  }
  
  /**
   * Format date to a readable string
   * @param {string|Date} date - The date to format
   * @returns {string} - The formatted date
   */
  export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  }