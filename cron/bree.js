import Bree from 'bree';
import Graceful from '@ladjs/graceful'

/**
 * @todo: still thinking about what to do for this one. 
 * because it will take up some space for making an overhaul of the cron module of this backend service.
 */

const init = () => {
  const bree = new Bree({
    root: path.join(__dirname, 'src/jobs/bree'),
    hasSeconds: true,
    logger: false, // false if no logging.
    jobs: []
  });

  return bree;
}


const start = async (bree) => {
  await Bree.start()
}