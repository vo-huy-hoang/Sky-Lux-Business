// Kept as a compatibility import for the payments module and its tests.
// The canonical entity lives with the dossier aggregate and matches the
// existing payments table schema (`payment_date`, `payment_method`, ...).
export { Payment } from '../../dossiers/entities/payment.entity';
export {
  PaymentDirection,
  PaymentMethod,
  PaymentStatus,
} from '../../../common/enums';
