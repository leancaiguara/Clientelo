const { Schema, model } = require("mongoose");

const ProductoSchema = new Schema({
  pedido: {
    type: Array,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  cliente: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Cliente",
  },
  vendedor: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Usuario",
  },
  estado: {
    type: String,
    default: "PENDIENTE",
  },
  creado: {
    type: Date,
    default: Date.now(),
  },
});
module.exports = model("Pedido", ProductoSchema);
