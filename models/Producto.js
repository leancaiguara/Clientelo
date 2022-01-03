const { Schema, model } = require("mongoose");

const ProductosSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  existencia: {
    type: Number,
    required: true,
  },
  precio: {
    type: Number,
    required: true,
    trim: true,
  },
  creado: {
    type: Date,
    default: Date.now(),
  },
});

ProductosSchema.index({ nombre: "text" });

module.exports = model("Producto", ProductosSchema);
