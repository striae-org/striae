import { classes } from '~/utils/ui';
import styles from './icon.module.css';
import sprites from './icons.svg';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  icon: string;
  className?: string;
  size?: number;
  ref?: React.Ref<SVGSVGElement>;
}

export const Icon = ({ icon, className, size, ref, ...rest }: IconProps) => {
  return (
    <svg
      aria-hidden
      ref={ref}
      className={classes(styles.icon, className)}
      width={size || 24}
      height={size || 24}
      {...rest}
    >
      <use href={`${sprites}#${icon}`} />
    </svg>
  );
};
