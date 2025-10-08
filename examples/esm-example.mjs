import mongoose from 'mongoose';
import { currencyConversionPlugin } from 'mongoose-currency-convert';
import { SimpleCache } from 'mongoose-currency-convert/cache';

const cache = new SimpleCache();

const productSchema = new mongoose.Schema({
  price: {
    amount: Number,
    currency: String,
    date: Date,
    converted: {
      amount: Number,
      currency: String,
      date: Date,
    }
  },
  price_2: {
    amount: Number,
    currency: String,
    date: Date,
    converted: {
      amount: Number,
      currency: String,
      date: Date,
    }
  },
});

const options = {
  fields: [
    {
      sourcePath: 'price.amount',
      currencyPath: 'price.currency',
      datePath: 'price.date',
      targetPath: 'price.converted',
      toCurrency: 'EUR'
    }, {
      sourcePath: 'price_2.amount',
      currencyPath: 'price_2.currency',
      datePath: 'price_2.date',
      targetPath: 'price_2.converted',
      toCurrency: 'GBP'
    }
  ],
  getRate: async (from, to, date) => {
    if (from === 'USD' && to === 'EUR') return 0.9;
    if (from === 'USD' && to === 'GBP') return 0.8;
    return 1;
  },
  cache,
};

productSchema.plugin(currencyConversionPlugin, options);

const Product = mongoose.model('Product', productSchema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/test-currency');

  const prod = new Product({
    price: { amount: 100, currency: 'USD', date: new Date() },
    price_2: { amount: 200, currency: 'USD', date: new Date() }
  });
  await prod.save();
  console.log('Product saved:', prod);
  await mongoose.disconnect();
}

run().catch(console.error);
