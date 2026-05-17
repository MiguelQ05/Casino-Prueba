/**
 * useBalance.js — Saldo global compartido entre todos los juegos
 *
 * Al usar `ref` fuera de cualquier componente, Vue mantiene
 * UNA SOLA instancia reactiva para toda la aplicación.
 * Cualquier componente que importe este composable leerá
 * y escribirá el mismo saldo.
 */
import { ref } from 'vue'

const balance = ref(1000)

export function useBalance() {
  /** Resta una cantidad del saldo (apuesta) */
  function deduct(amount) {
    balance.value = Math.max(0, balance.value - amount)
  }

  /** Suma una cantidad al saldo (premio) */
  function credit(amount) {
    balance.value += amount
  }

  /** Recarga el saldo a 1000 si el jugador se ha quedado sin nada */
  function refill() {
    balance.value = 1000
  }

  return { balance, deduct, credit, refill }
}
