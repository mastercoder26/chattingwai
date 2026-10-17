import Image from 'next/image';
import { Cpu } from 'lucide-react';
import { modelLogo } from '@/lib/model-logos';

export function ModelLogo({
  modelId,
  provider,
  size = 24,
}: {
  modelId: string;
  provider?: string;
  size?: number;
}) {
  const logo = modelLogo(modelId, provider);
  return (
    <span className="model-logo" style={{ width: size, height: size }} aria-hidden="true">
      {logo ? (
        <>
          <Image
            className="model-logo-light"
            src={`/model-logos/light/${logo}.png`}
            alt=""
            width={size}
            height={size}
            unoptimized
          />
          <Image
            className="model-logo-dark"
            src={`/model-logos/dark/${logo}.png`}
            alt=""
            width={size}
            height={size}
            unoptimized
          />
        </>
      ) : (
        <Cpu size={size} strokeWidth={1.5} />
      )}
    </span>
  );
}
