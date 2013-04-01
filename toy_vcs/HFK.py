from datetime import datetime
import os
import shutil
import argparse
import vc
import hashlib

# I know it's bad to have long comments explaining things,
# so see hfk_structure.txt for my ramble ;)

class HashedFileKeeper:
    def __init__(self):
        self.backup_path= ".hfk"
        self.contents_path = os.path.join(self.backup_path,"files")
        self.revisions_path = os.path.join(self.backup_path,"revisions")
        self.direds = [self.contents_path,self.revisions_path]
        self.index_path = os.path.join(self.backup_path,"index")
        self.identity_string = "HFK INDEX FILE"
        self.not_exist_msg = "Error: directory not initialised"
        self.already_init_msg = "Error: repository already exists for this directory"
        self.no_existing_backup = "Error: no hfk repository exists for this directory"

    def initialise(self):
        if vc.is_init(self.backup_path, self.direds, self.index_path, self.identity_string):
            print(self.already_init_msg)
            return False
        
        return vc.init(self.backup_path, self.direds, self.index_path, self.identity_string)
        
    def remove_repository(self):
        if vc.remove_repository(self.backup_path): return True
        else:
            print(self.not_exist_msg)
            return False
        
    def get_backups(self):
        # I have no idea how your `with' magic works
        # nor how we should be handling exceptions
        f = open(self.index_path,"r")
        return [l.split(';') for l in f.read().split('\n')[1:]]

    def careful_hash(self,in_file):
        sha256 = hashlib.sha256()
        bs = 2**16 # we should read the file in chunks
        f = open(in_file,"rb")
        while True:
            d = f.read(bs)
            if not d:
                f.close()
                break
            sha256.update(d)
        return sha256.hexdigest()

    def backup(self):
        if not vc.is_init(self.backup_path, self.direds, self.index_path, self.identity_string):
            print(self.not_exist_msg)
            return False
        backup_no = str(len(self.get_backups())+1) # this is terrible, but for now I'm lazy
        # Now we go about hashing things and checking if we have them already.
        existing = set(os.listdir(self.contents_path))
        current_files = []
        directory_structure = []
        for dirname,subdirs,fnames in os.walk("."):
            # Let's not recurse into .hfk
            if self.backup_path in subdirs:
                subdirs.remove(self.backup_path)
            # for every file in the current directory, grab its hash
            for f in fnames:
                current_files.append(os.path.join(dirname,f))
            # we also need to store the directory structure
            for d in subdirs:
                directory_structure.append(os.path.join(dirname,d))
        pairs = [(f,self.careful_hash(f)) for f in current_files]
        # Let's create the catalogue file first, a simple dump of pairs
        catalogue = open(os.path.join(self.revisions_path,backup_no),"w")
        catalogue.write('\n'.join([p[0]+' '+p[1] for p in pairs]))
        catalogue.close()
        # and we need to dump the dir structure
        structure = open(os.path.join(self.revisions_path,backup_no+"d"),"w")
        structure.write('\n'.join(directory_structure))
        structure.close()
        # Copy accross all the files listed in pairs but not currently in files/
        files = []
        for fle,hsh in pairs:
            if not hsh in existing:
                files.append((fle,hsh))
                print("--> "+fle+" is new or has changed, storing")
        if files == []:
            print("No changes, bailing.")
            return True
        vc.cp(files,".",self.contents_path)
        
        with open(self.index_path,"a") as f:
            f.write("\n%s;%s"%(backup_no,str(datetime.now())))
        return True

    def restore(self,revision=-1):
        if not vc.is_init(self.backup_path, [self.contents_path],
                          self.index_path, self.identity_string):
            print(self.not_exist_msg)
            return False

        # If -1, find the last revision
        if revision==-1:
            revision==len(open(self.index_path,"r").read().split('\n'))

        # pull up the catalogue of files and directory structure files
        catalogue = os.path.join(self.revisions_path,str(revision))
        structure = os.path.join(self.revisions_path,str(revision)+"d")
        if not (os.path.exists(catalogue) and os.path.exists(structure)):
            print(self.no_existing_backup)
            return False

        # STEVE: Do we want to remove all files in the current dir?
        del_files = os.listdir(".")
        del_files.remove(self.backup_path)
        vc.rm(del_files, ".")

        # rebuild structure from the file
        dirfile = open(structure,'r')
        dirs = dirfile.read().split('\n')
        dirfile.close()
        for d in dirs:
            os.mkdir(d)

        # generate pairs of files and hashes (actually file names in files/)
        catfile = open(catalogue,'r')
        files = [(p[1],p[0]) for p in [line.split(' ') for line in catfile.read().split('\n')]]
        catfile.close()
        
        # simply copy them to the current directory
        vc.cp(files,self.contents_path,".")
        return True
