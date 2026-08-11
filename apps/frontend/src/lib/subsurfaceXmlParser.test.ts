import { describe, expect, it } from 'vitest';
import { parseSubsurfaceXML } from './subsurfaceXmlParser';

describe('parseSubsurfaceXML profile identity', () => {
  it('retains mean depth, dive mode, and dive-computer identity', () => {
    const [dive] = parseSubsurfaceXML(`
      <divelog>
        <dives>
          <dive date="2026-08-10" time="09:30:00" duration="45:00 min" divemode="CCR">
            <divecomputer vendor="Shearwater" model="Perdix 2" deviceid="abc123">
              <depth max="30 m" mean="18.5 m" />
            </divecomputer>
          </dive>
        </dives>
      </divelog>
    `);

    expect(dive).toMatchObject({
      depth: 30,
      meanDepth: 18.5,
      diveMode: 'CCR',
      computer: { vendor: 'Shearwater', model: 'Perdix 2', deviceId: 'abc123' },
    });
  });
});
