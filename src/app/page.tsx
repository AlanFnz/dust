import ParticleCanvas from '@/components/particle-canvas';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <ParticleCanvas />
    </div>
  );
}
