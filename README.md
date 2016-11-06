QBSync: A synchronised video player for lonely hearts
=====================================================

QBSync (pronounced 'cubie sync') is a thrown-together web application which
allows two (or more) people to watch a HTML 5 video at the same time. You can
try it out by visiting [qbsync.jhnet.co.uk](http://qbsync.jhnet.co.uk/).

It was built to allow me and my wife to watch TV together while I am working
away from home while we use Skype (or similar) to chuckle along with whatever
we're watching. As a consequence, this software does not strive to achieve much
better than 100ms-or-so sync. Its primary goal, however, is to ensure that
controls are shared and that things like buffering etc. do not lead to players
drifting out of sync. It was also built in a hurry and with little regard for
making the system any better than needed to
just-about-barely-work-most-of-the-time...

QBSync is build using PHP on the server and Javascript in the client. The
server is largely responsible for holding state and deciding when to
pause/resume/seek etc. based on status reports and requests from clients.
Server state is kept in files on disk as a lump of JSON in a way that will make
most people squirm... The first prototype of the client was written using
JQuery in a kind-of ad-hoc mess. This was gradually replaced with a React/ES6
based implementation as a learning experience for me and partly to make the
client more presentable and the user interface more obvious.
