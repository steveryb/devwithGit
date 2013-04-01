import Backup
import FileKeeper
import HFK

#bk = FileKeeper.FileKeeper()
#bk.remove_repository()
#bk.initialise()
#bk.backup()
#bk.restore(1)

hfk = HFK.HashedFileKeeper()
#hfk.remove_repository()
hfk.initialise()
hfk.backup()
