import mongoose from 'mongoose';
import { currencyConversionPlugin } from 'mongoose-currency-convert';
import { SimpleCache } from 'mongoose-currency-convert/cache';
import type { CurrencyPluginOptions } from 'mongoose-currency-convert/types';

const cache = new SimpleCache<number>();

const productSchema = new mongoose.Schema({
  price: {
    amount: Number,
    currency: String,
    date: Date
  },
  converted: Object
});

const options: CurrencyPluginOptions = {
  fields: [
    {
      sourcePath: 'price.amount',
      currencyPath: 'price.currency',
      datePath: 'price.date',
      targetPath: 'converted',
      toCurrency: 'EUR'
    }
  ],
  getRate: async (from, to, date) => {
    if (from === 'USD' && to === 'EUR') return 0.9;
    return 1;
  },
  cache,
};

productSchema.plugin(currencyConversionPlugin, options);

const Product = mongoose.model('Product', productSchema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/test-currency');

  const prod = new Product({
    price: { amount: 100, currency: 'USD', date: new Date() }
  });
  await prod.save();
  console.log('Prodotto salvato:', prod);
  await mongoose.disconnect();
}

run().catch(console.error);
