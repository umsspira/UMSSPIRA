import Image from 'next/image';
import Link from 'next/link';
import navbarStyles from '@/shared/components/navbar/navbar.module.css';
import styles from './registration-header.module.css';

export function RegistrationHeader() {
  return (
    <header className={navbarStyles.root}>
      <div className={navbarStyles.bar}>
        <Link href="/" className={navbarStyles.logo} aria-label="UMSSPIRA: ir al inicio">
          <Image
            src="/assets/events/umsspira-logo-desktop.png"
            alt="UMSSPIRA"
            width={170}
            height={56}
            priority
          />
        </Link>
        <div className={styles.account}>
          <span className={styles.prompt}>¿Ya tienes una cuenta?</span>
          <Link href="/login" className={navbarStyles.register}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}
